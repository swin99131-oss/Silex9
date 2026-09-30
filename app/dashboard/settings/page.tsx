import { Header } from "@/components/dashboard/header"
import { SettingsContent } from "@/components/settings/settings-content"

export default function SettingsPage() {
  return (
    <>
<Header title="الإعدادات" description="أدر معلومات متجرك وتفضيلات الإشعارات والمظهر." />
        <div className="mt-6">
          <SettingsContent />
        </div>
</>
  )
}
