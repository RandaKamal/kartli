import { registerKitchen } from "./actions";

export default function Register() {
  return (
    <main>
      <h1>Register a kitchen</h1>
      <form action={registerKitchen}>
        <div>
          <label>
            Kitchen name
            <input type="text" name="kitchenName" required />
          </label>
        </div>
        <div>
          <label>
            Your name
            <input type="text" name="adminName" required />
          </label>
        </div>
        <div>
          <label>
            Your password
            <input type="password" name="adminPassword" required />
          </label>
        </div>
        <div>
          <label>
            Members to invite (one name per line)
            <textarea name="members" rows={4} />
          </label>
        </div>
        <button type="submit">Create kitchen</button>
      </form>
    </main>
  );
}
