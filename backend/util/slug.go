package util

import (
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

func GenerateSlug(name string) string {
	// normalize unicode characters
	name = norm.NFKD.String(name)

	// convert to lowercase
	name = strings.ToLower(name)

	// replace non-alphanumeric chars with hyphens
	var result strings.Builder
	var lastChar rune

	for _, r := range name {
		if unicode.IsLetter(r) || unicode.IsNumber(r) {
			result.WriteRune(r)
			lastChar = r
		} else if lastChar != '-' {
			result.WriteRune('-')
			lastChar = '-'
		}
	}

	// trim hyphens from ends
	return strings.Trim(result.String(), "-")
}

func IsValidSlug(name string) bool {
	if len(name) == 0 {
		return false
	}

	// Check first and last characters are alphanumeric
	first := rune(name[0])
	last := rune(name[len(name)-1])
	if !unicode.IsLetter(first) && !unicode.IsNumber(first) {
		return false
	}
	if !unicode.IsLetter(last) && !unicode.IsNumber(last) {
		return false
	}

	// Check all characters are alphanumeric or hyphen
	for _, r := range name {
		if !unicode.IsLetter(r) && !unicode.IsNumber(r) && r != '-' {
			return false
		}
	}

	// Check for consecutive hyphens
	return !strings.Contains(name, "--")
}
