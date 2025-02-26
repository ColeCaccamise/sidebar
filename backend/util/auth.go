package util

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

func IsAuthenticated(authToken *http.Cookie, apiKey string) (bool, string, error) {
	if authToken != nil {
		decoded, err := ParseJWT(authToken.Value)
		if err != nil {
			return false, "", err
		}

		if decoded.WorkosUserID != "" {
			return true, decoded.WorkosUserID, nil
		}
	} else if apiKey != "" {
		// TODO: check api key in db / env
		if apiKey == "apikey" {
			return true, "auth", nil
		}
	}

	return false, "", fmt.Errorf("unauthorized")
}

//func ParseJWTV1(authToken string) (userId string, authTokenType string, sessionId string, err error) {
//	token, err := jwt.Parse(authToken, func(token *jwt.Token) (any, error) {
//		return []byte(os.Getenv("JWT_SECRET")), nil
//	})
//
//	if err != nil {
//		return "", "", "", fmt.Errorf("token invalid or expired")
//	}
//
//	claims := token.Claims.(jwt.MapClaims)
//	userId = claims["user_id"].(string)
//	authTokenType = claims["type"].(string)
//	sessionId = claims["session_id"].(string)
//
//	if userId == "" {
//		return "", "", "", fmt.Errorf("user not found")
//	}
//
//	return userId, authTokenType, sessionId, nil
//}

type jwks struct {
	Keys []struct {
		Kid string   `json:"kid"`
		Kty string   `json:"kty"`
		Alg string   `json:"alg"`
		Use string   `json:"use"`
		N   string   `json:"n"`
		E   string   `json:"e"`
		X5c []string `json:"x5c"`
	} `json:"keys"`
}

func fetchJWKS(url string) (*jwks, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch jwks: %v", err)
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			return
		}
	}(resp.Body)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read jwks response: %v", err)
	}

	var keys jwks
	if err := json.Unmarshal(body, &keys); err != nil {
		return nil, fmt.Errorf("failed to parse jwks: %v", err)
	}

	return &keys, nil
}

func getPublicKeyFromJWKS(jwks *jwks) (*rsa.PublicKey, error) {
	// get first key from the set
	if len(jwks.Keys) == 0 {
		return nil, fmt.Errorf("no keys found in jwks")
	}

	// decode x5c certificate
	certData, err := base64.StdEncoding.DecodeString(jwks.Keys[0].X5c[0])
	if err != nil {
		return nil, fmt.Errorf("failed to decode x5c cert: %v", err)
	}

	// parse x509 certificate
	cert, err := x509.ParseCertificate(certData)
	if err != nil {
		return nil, fmt.Errorf("failed to parse x509 cert: %v", err)
	}

	// get rsa public key from certificate
	publicKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("invalid public key type")
	}

	return publicKey, nil
}

type DecodedAuthToken struct {
	WorkosUserID   string   `json:"sub"`
	SessionID      string   `json:"sid"`
	OrganizationID string   `json:"org_id"`
	Role           string   `json:"role"`
	Permisisons    []string `json:"permisisons"`
}

func ParseJWT(authToken string) (decoded DecodedAuthToken, err error) {
	jwksUrl := fmt.Sprintf("https://api.workos.com/sso/jwks/%s", os.Getenv("WORKOS_CLIENT_ID"))

	jwks, err := fetchJWKS(jwksUrl)
	if err != nil {
		return DecodedAuthToken{}, fmt.Errorf("failed to fetch jwks: %v", err)
	}

	publicKey, err := getPublicKeyFromJWKS(jwks)
	// todo handle error
	token, err := jwt.Parse(authToken, func(token *jwt.Token) (interface{}, error) {
		// validate signing method is RS256
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return publicKey, nil
	})

	if err != nil {
		return DecodedAuthToken{}, fmt.Errorf("token invalid or expired")
	}

	claims := token.Claims.(jwt.MapClaims)

	// check and set workosUserId
	var workosUserId string
	if val, ok := claims["sub"]; ok {
		if strVal, ok := val.(string); ok {
			workosUserId = strVal
		}
	}

	// check and set sid
	var sid string
	if val, ok := claims["sid"]; ok {
		if strVal, ok := val.(string); ok {
			sid = strVal
		}
	}

	// check and set orgId
	var orgId string
	if val, ok := claims["org_id"]; ok {
		if strVal, ok := val.(string); ok {
			orgId = strVal
		}
	}

	// check and set role
	var role string
	if val, ok := claims["role"]; ok {
		if strVal, ok := val.(string); ok {
			role = strVal
		}
	}

	// check and set permissions
	var permissions []string
	if val, ok := claims["permissions"]; ok {
		if permSlice, ok := val.([]interface{}); ok {
			// convert interface slice to string slice
			permissions = make([]string, 0, len(permSlice))
			for _, p := range permSlice {
				if strVal, ok := p.(string); ok {
					permissions = append(permissions, strVal)
				}
			}
		}
	}

	if workosUserId == "" {
		return DecodedAuthToken{}, fmt.Errorf("user not found")
	}

	return DecodedAuthToken{
		WorkosUserID:   workosUserId,
		SessionID:      sid,
		OrganizationID: orgId,
		Role:           role,
		Permisisons:    permissions,
	}, nil
}
