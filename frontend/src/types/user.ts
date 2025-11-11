export interface UserData {
  company: string;
  email: string;
  displayName?: string;
  sAMAccountName?: string;
  employeeID?: string;
  userPrincipalName?: string;
  dn: string;
  accountStatus?: string;
hasPin?: boolean;
  has2FA?: boolean;
}