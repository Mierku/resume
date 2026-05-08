import { redirect } from 'next/navigation'

export default function DemoFormPage() {
  redirect('/?installGuide=1')
}
