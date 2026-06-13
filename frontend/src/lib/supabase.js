export const supabase = {
  auth: {
    signInWithPassword: async () => { throw new Error('Supabase not in use - use local API'); },
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signUp: async () => { throw new Error('Supabase not in use - use local API'); },
  },
  from: () => ({
    select: () => ({ error: new Error('Supabase not in use') }),
  }),
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
};
