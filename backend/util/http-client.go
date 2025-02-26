package util

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// wraps http.client with convenience methods
type HTTPClient struct {
	client *http.Client
}

// creates a new httpclient
func NewHTTPClient() *HTTPClient {
	return &HTTPClient{
		client: &http.Client{},
	}
}

type HTTPRequest struct {
	Method      string
	URL         string
	Body        interface{}
	Headers     map[string]string
	QueryParams map[string]string
	AuthToken   *http.Cookie
	APIKey      string
}

type HTTPResponse struct {
	StatusCode int
	RawBody    []byte
	Body       interface{} // Changed from json.RawMessage to interface{} to handle non-JSON responses
	Headers    http.Header
}

// creates an http.request with the given configuration
func (c *HTTPClient) buildRequest(reqConfig HTTPRequest) (*http.Request, error) {
	var reqBody io.Reader
	if reqConfig.Body != nil {
		jsonBody, err := json.Marshal(reqConfig.Body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(reqConfig.Method, reqConfig.URL, reqBody)
	if err != nil {
		return nil, err
	}

	// set headers
	for key, value := range reqConfig.Headers {
		req.Header.Set(key, value)
	}
	if reqConfig.Body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	// set query params
	q := req.URL.Query()
	for key, value := range reqConfig.QueryParams {
		q.Add(key, value)
	}
	req.URL.RawQuery = q.Encode()

	// set auth
	if reqConfig.AuthToken != nil {
		req.AddCookie(reqConfig.AuthToken)
	}
	if reqConfig.APIKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", reqConfig.APIKey))
	}

	return req, nil
}

// performs an http request and returns the response
func (c *HTTPClient) Do(reqConfig HTTPRequest) (*HTTPResponse, error) {
	req, err := c.buildRequest(reqConfig)
	if err != nil {
		return nil, err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var parsedBody interface{}
	if err = json.Unmarshal(body, &parsedBody); err != nil {
		// if json parsing fails, return raw body as string
		parsedBody = string(body)
	}

	if resp.StatusCode >= 400 {
		return &HTTPResponse{
			StatusCode: resp.StatusCode,
			RawBody:    body,
			Body:       parsedBody,
			Headers:    resp.Header,
		}, fmt.Errorf("%s", string(body))
	}

	return &HTTPResponse{
		StatusCode: resp.StatusCode,
		RawBody:    body,
		Body:       parsedBody,
		Headers:    resp.Header,
	}, nil
}

// performs an http get request
func (c *HTTPClient) Get(url string) (*HTTPResponse, error) {
	return c.Do(HTTPRequest{
		Method: http.MethodGet,
		URL:    url,
	})
}

// performs an http post request with json body
func (c *HTTPClient) Post(url string, body interface{}, headers map[string]string) (*HTTPResponse, error) {
	return c.Do(HTTPRequest{
		Method:  http.MethodPost,
		URL:     url,
		Body:    body,
		Headers: headers,
	})
}

// performs an http put request with json body
func (c *HTTPClient) Put(url string, body interface{}) (*HTTPResponse, error) {
	return c.Do(HTTPRequest{
		Method: http.MethodPut,
		URL:    url,
		Body:   body,
	})
}

// performs an http delete request
func (c *HTTPClient) Delete(url string) (*HTTPResponse, error) {
	return c.Do(HTTPRequest{
		Method: http.MethodDelete,
		URL:    url,
	})
}

// decodes the body of an http request into a struct
func DecodeBody(body io.ReadCloser, v interface{}) error {
	if err := json.NewDecoder(body).Decode(v); err != nil {
		errorMsg := "invalid request"
		if err == io.EOF {
			errorMsg = "request body is empty"
		}
		return fmt.Errorf("invalid request: %s", errorMsg)
	}
	return nil
}

func BytesToReadCloser(b []byte) io.ReadCloser {
	return io.NopCloser(bytes.NewReader(b))
}
