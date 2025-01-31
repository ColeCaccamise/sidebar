package util

import "encoding/json"

func IsJSON(str string) bool {
	var js json.RawMessage
	return json.Unmarshal([]byte(str), &js) == nil
}

func StringToJSON(str string) (data interface{}, err error) {
	if IsJSON(str) {
		err = json.Unmarshal([]byte(str), &data)
		if err != nil {
			return nil, err
		}
		
		return data, nil
	} else {
		return str, nil
	}
}
