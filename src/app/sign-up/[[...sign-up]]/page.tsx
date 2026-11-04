import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <SignUp />
    </div>
  );
}
