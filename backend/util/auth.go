package util

import (
	"fmt"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

func IsAuthenticated(authToken *http.Cookie, apiKey string) (bool, string, error) {
	if authToken != nil {
		userId, authTokenType, err := ParseJWT(authToken.Value)
		if err != nil {
			return false, "", err
		}

		if userId != "" && authTokenType == "auth" {
			return true, userId, nil
		}
	} else if apiKey != "" {
		// TODO: check api key in db / env
		if apiKey == "apikey" {
			return true, "auth", nil
		}
	}

	return false, "", fmt.Errorf("unauthorized")
}

func ParseJWT(authToken string) (userId string, authTokenType string, err error) {
	token, err := jwt.Parse(authToken, func(token *jwt.Token) (any, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil {
		return "", "", fmt.Errorf("token invalid or expired")
	}

	claims := token.Claims.(jwt.MapClaims)
	userId = claims["user_id"].(string)
	authTokenType = claims["type"].(string)

	if userId == "" {
		return "", "", fmt.Errorf("user not found")
	}

	return userId, authTokenType, nil
}
