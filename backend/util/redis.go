package util

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	Client *redis.Client
}

func NewRedisClient() *RedisClient {
	redisUrl := fmt.Sprintf("rediss://default:%s@%s:%s", os.Getenv("REDIS_PASSWORD"), os.Getenv("REDIS_ENDPOINT"), os.Getenv("REDIS_PORT"))

	fmt.Println("redisUrl:", redisUrl)

	opt, _ := redis.ParseURL(redisUrl)
	client := redis.NewClient(opt)

	return &RedisClient{
		Client: client,
	}
}

type RedisSetOpts struct {
	Key   string
	Value interface{}
}

func (r *RedisClient) Set(ctx context.Context, opts RedisSetOpts) error {
	return r.Client.Set(ctx, opts.Key, opts.Value, 0).Err()
}

type RedisGetOpts struct {
	Key string
}

func (r *RedisClient) Get(ctx context.Context, opts RedisGetOpts) (interface{}, error) {
	val, err := r.Client.Get(ctx, opts.Key).Result()
	if err != nil {
		return "", err
	}

	return val, nil
}

func (r *RedisClient) GetJSON(ctx context.Context, opts RedisGetOpts) (interface{}, error) {
	val, err := r.Client.Get(ctx, opts.Key).Result()
	if err != nil {
		return "", err
	}

	fmt.Println(val)

	var data interface{}
	err = json.Unmarshal([]byte(val), &data)
	if err != nil {
		return "", err
	}

	return data, nil
}
