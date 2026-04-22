import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="h-full flex items-center justify-center" style={{ background: "var(--cf-bg)" }}>
      <SignUp />
    </div>
  )
}
