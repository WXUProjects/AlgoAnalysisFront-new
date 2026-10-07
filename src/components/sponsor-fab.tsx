import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HeartHandshakeIcon } from 'lucide-react'
import { getSponsorSettings } from '@/api/sponsor'
import { Button } from '@/components/ui/button'

/** 首页右下角悬浮的「赞助支持」入口；仅在开启打赏开关时出现 */
export function SponsorFab() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getSponsorSettings().then((res) => {
      if (!cancelled && res.success && res.data) {
        setEnabled(res.data.donationEnabled)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!enabled) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-end px-4 md:bottom-6 md:px-6">
      <Button
        asChild
        size="lg"
        className="pointer-events-auto rounded-full shadow-lg"
      >
        <Link to="/sponsor">
          <HeartHandshakeIcon data-icon="inline-start" />
          <span className="hidden sm:inline">赞助支持</span>
        </Link>
      </Button>
    </div>
  )
}
