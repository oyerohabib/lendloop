import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <SignIn />
    </div>
  );
}
