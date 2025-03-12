// src/interfaces/ldap-tree.interface.ts
export interface LdapTreeNode {
    dn: string;
    name: string;
    type: 'folder' | 'item';
    children: LdapTreeNode[];
    attributes: {
      sn?: string;
      givenName?: string;
      mail?: string;
      objectClass?: string[];
    };
  }