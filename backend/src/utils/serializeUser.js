export default function serializeUser(user) {
  return {
    id: String(user._id),
    name: user.displayName,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
