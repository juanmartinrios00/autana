import { Skeleton } from '../ui/Skeleton'

export function VehicleCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'list' }) {
  return (
    <div className={`vcard vcard--${layout}`} aria-hidden="true">
      <div className="vcard__media vcard__media--loading" />
      <div className="vcard__body">
        <Skeleton height="17px" width="78%" />
        <Skeleton height="13px" width="60%" />
        <Skeleton height="22px" width="44%" />
        <hr className="rule" />
        <div className="vcard__foot">
          <Skeleton height="12px" width="38%" />
          <Skeleton height="12px" width="24%" />
        </div>
      </div>
    </div>
  )
}
