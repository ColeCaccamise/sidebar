export function getTeamRoleLanguage(role: string) {
  if (role === 'member') {
    return 'a member';
  } else if (role === 'admin') {
    return 'an admin';
  } else if (role === 'owner') {
    return 'an owner';
  } else {
    return null;
  }
}
