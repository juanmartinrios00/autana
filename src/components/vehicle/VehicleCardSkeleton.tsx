import { Skeleton } from '../ui/Skeleton'

export function VehicleCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'list' }) {
  return (
    <div className={`vcard vcard--${layout}`} aria-hidden="true">
      <div className="vcard__media vcard__media--loading" />
      <div className="vcard__body">
        <Skeleton height="15px" width="86%" />
        <Skeleton height="15px" width="52%" />
        <Skeleton height="26px" width="48%" />
        <Skeleton height="13px" width="40%" />
        <Skeleton height="13px" width="58%" />
      </div>
    </div>
  )
}
