export function parseJwt(token: string) {
  if (!token) {
    return null;
  }
  const base64Url = token.split('.')[1];
  if (!base64Url) {
    return null;
  }
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return JSON.parse(jsonPayload);
}

export function isTokenExpired(token: string) {
  if (!token) {
    return true;
  }

  const decodedToken = parseJwt(token);
  const currentTime = Date.now() / 1000;
  return decodedToken.exp < currentTime;
}
