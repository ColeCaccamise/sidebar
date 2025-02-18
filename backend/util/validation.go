package util

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

func ValidatePassword(password string) (eightOrMore, number, upper, special bool) {
	letters := 0
	for _, char := range password {
		switch {
		case unicode.IsNumber(char):
			number = true
			letters++
		case unicode.IsUpper(char):
			upper = true
			letters++
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			special = true
		case unicode.IsLetter(char) || char == ' ':
			letters++
		default:
			//return false, false, false, false
		}
	}
	eightOrMore = letters >= 8
	return
}

func ValidateEmail(email string) bool {
	// Check basic length constraints
	if len(email) < 3 || len(email) > 254 || !utf8.ValidString(email) {
		return false
	}

	// Split into local and domain parts
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	local, domain := parts[0], parts[1]

	// Check local part constraints
	if len(local) == 0 || len(local) > 64 {
		return false
	}

	// Check domain constraints
	if len(domain) == 0 || len(domain) > 255 {
		return false
	}

	// Check for consecutive dots
	if strings.Contains(email, "..") {
		return false
	}

	// Check domain has at least one dot and valid TLD (min 2 chars)
	domainParts := strings.Split(domain, ".")
	if len(domainParts) < 2 || len(domainParts[len(domainParts)-1]) < 2 {
		return false
	}

	emailPattern := regexp.MustCompile(`^[a-zA-Z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`)

	return emailPattern.MatchString(email)
}
