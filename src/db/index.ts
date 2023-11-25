let users = [{ id: 0, email: "kody@example.com", password: "twixrox" }];
export const db = {
  user: {
    async create({ data }: { data: { email: string; password: string } }) {
      let user = { ...data, id: users.length };
      users.push(user);
      return user;
    },
    async findUnique({
      where: { email = undefined, id = undefined },
    }: {
      where: { email?: string; id?: number };
    }) {
      if (id !== undefined) {
        return users.find((user) => user.id === id);
      } else {
        return users.find((user) => user.email === email);
      }
    },
  },
};
