import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export interface Crumb {
  label: React.ReactNode
  href?: string
}

export interface BreadcrumbsProps {
  items: Crumb[]
  className?: string
}

/** Breadcrumb a partir de una lista (el último es la página actual). */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <div key={i} className="flex items-center">
              {i > 0 && <BreadcrumbSeparator className="mx-1.5" />}
              <BreadcrumbItem>
                {last || !c.href ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
