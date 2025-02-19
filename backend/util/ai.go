package util

import "fmt"

// model type enum
type ModelType string

const (
	Anthropic ModelType = "anthropic"
	DeepSeek  ModelType = "deepseek"
)

// anthropic model type
type AnthropicModel string

const (
	ClaudeSonnet AnthropicModel = "claude-3-5-sonnet-20241022"
	ClaudeHaiku  AnthropicModel = "claude-3-5-haiku-20241022"
	ClaudeOpus   AnthropicModel = "claude-3-5-opus-20241022"
)

// deepseek model type
type DeepSeekModel string

const (
	DeepseekChat     DeepSeekModel = "deepseek-chat"
	DeepseekReasoner DeepSeekModel = "deepseek-reasoner"
)

// ai client interface defines available methods
type AIClientInterface interface {
	Chat(opts *ChatRequest) (interface{}, error)
}

type AIClient struct {
	ModelType ModelType
	Model     interface{}
	APIKey    string
}

// instantiate a new AI client
type NewAIClientOpts struct {
	ModelType ModelType
	Model     interface{}
	APIKey    string
}

func NewAIClient(opts *NewAIClientOpts) (AIClientInterface, error) {
	if opts.APIKey == "" {
		return nil, fmt.Errorf("api key is required")
	}

	// validate model type matches model
	switch opts.ModelType {
	case Anthropic:
		if _, ok := opts.Model.(AnthropicModel); !ok {
			return nil, fmt.Errorf("invalid anthropic model")
		}
	case DeepSeek:
		if _, ok := opts.Model.(DeepSeekModel); !ok {
			return nil, fmt.Errorf("invalid deepseek model")
		}
	default:
		return nil, fmt.Errorf("invalid model type")
	}

	return &AIClient{
		ModelType: opts.ModelType,
		Model:     opts.Model,
		APIKey:    opts.APIKey,
	}, nil
}

// options for text generation
type GenerateTextOpts struct {
	Prompt       string
	Stream       bool
	SystemPrompt string
	MaxTokens    int
}

type ChatRequest struct {
	Messages []ChatMessage `json:"messages"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// generate text with anthropic model
func (c *AIClient) generateAnthropicText(opts *ChatRequest) (interface{}, error) {
	model, ok := c.Model.(AnthropicModel)
	if !ok {
		return nil, fmt.Errorf("invalid anthropic model")
	}

	fmt.Printf("making a request with anthropic model: %s", model)
	return nil, fmt.Errorf("not implemented")
}

type makeDeepSeekRequestOpts struct {
	Model        DeepSeekModel
	SystemPrompt string
	Prompt       string
	Stream       bool
}

type DeepSeekResponse struct {
	Choices []struct {
		FinishReason string      `json:"finish_reason"`
		Index        int         `json:"index"`
		Logprobs     interface{} `json:"logprobs"`
		Message      struct {
			Content string `json:"content"`
			Role    string `json:"role"`
		} `json:"message"`
	} `json:"choices"`
	Created           int    `json:"created"`
	Id                string `json:"id"`
	Model             string `json:"model"`
	Object            string `json:"object"`
	SystemFingerprint string `json:"system_fingerprint"`
	Usage             struct {
		CompletionTokens      int `json:"completion_tokens"`
		PromptCacheHitTokens  int `json:"prompt_cache_hit_tokens"`
		PromptCacheMissTokens int `json:"prompt_cache_miss_tokens"`
		PromptTokens          int `json:"prompt_tokens"`
		PromptTokensDetails   struct {
			CachedTokens int `json:"cached_tokens"`
		} `json:"prompt_tokens_details"`
		TotalTokens int `json:"total_tokens"`
	} `json:"usage"`
}

func (c *AIClient) makeDeepSeekRequest(opts *makeDeepSeekRequestOpts) (interface{}, error) {
	httpClient := NewHTTPClient()
	requestBody := map[string]interface{}{
		"model": opts.Model,
		"messages": []map[string]string{
			{"role": "system", "content": opts.SystemPrompt},
			{"role": "user", "content": opts.Prompt},
		},
		"stream": opts.Stream,
	}
	authorizationHeader := map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", c.APIKey),
	}

	response, err := httpClient.Post("https://api.deepseek.com/chat/completions", requestBody, authorizationHeader)
	if err != nil {
		return nil, err
	}

	return response, nil
}

// generate text with deepseek model
func (c *AIClient) generateDeepSeekText(opts *GenerateTextOpts) (interface{}, error) {
	model, ok := c.Model.(DeepSeekModel)
	if !ok {
		return nil, fmt.Errorf("invalid deepseek model")
	}

	response, err := c.makeDeepSeekRequest(&makeDeepSeekRequestOpts{
		Model:        model,
		SystemPrompt: opts.SystemPrompt,
		Prompt:       opts.Prompt,
		Stream:       opts.Stream,
	})

	if err != nil {
		return nil, err
	}

	return response, nil
}

// generate text based on model type
func (c *AIClient) Chat(opts *ChatRequest) (interface{}, error) {
	switch c.ModelType {
	case Anthropic:
		return c.generateAnthropicText(opts)
	case DeepSeek:
		//return c.generateDeepSeekText(opts)
		return nil, fmt.Errorf("not implemented")
	default:
		return nil, fmt.Errorf("invalid model type")
	}
}
