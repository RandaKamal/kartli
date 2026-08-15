import { loginToKitchen } from "./actions";

export default function Login() {
  return (
    <main>
      <h1>Log in to a kitchen</h1>
      <form action={loginToKitchen}>
        <div>
          <label>
            Kitchen name
            <input type="text" name="kitchenName" required />
          </label>
        </div>
        <div>
          <label>
            Your name
            <input type="text" name="memberName" required />
          </label>
        </div>
        <div>
          <label>
            Password
            <input type="password" name="password" required />
          </label>
        </div>
        <button type="submit">Log in</button>
      </form>
    </main>
  );
}
