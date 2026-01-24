export class StorageService {
  static saveGroup(group: any): void {
    const groups = this.getAllGroups();
    const existing = groups.findIndex(g => g.id === group.id);
    if (existing >= 0) {
      groups[existing] = group;
    } else {
      groups.push(group);
    }
    localStorage.setItem('wos_groups', JSON.stringify(groups));
  }

  static getAllGroups(): any[] {
    const stored = localStorage.getItem('wos_groups');
    return stored ? JSON.parse(stored) : [];
  }

  static deleteGroup(groupId: string): void {
    const groups = this.getAllGroups();
    const filtered = groups.filter(g => g.id !== groupId);
    localStorage.setItem('wos_groups', JSON.stringify(filtered));
  }
}
