import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { Fragment } from "react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol
        className="flex items-center gap-2 text-sm text-muted-foreground"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link href="/" className="flex items-center gap-1 transition-colors hover:text-foreground" itemProp="item">
            <Home className="h-4 w-4" />
            <span itemProp="name" className="sr-only">
              Home
            </span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>
        {items.map((item, index) => (
          <Fragment key={index}>
            <ChevronRight className="h-4 w-4" />
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              {item.href ? (
                <Link href={item.href} className="transition-colors hover:text-foreground" itemProp="item">
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span className="font-medium text-foreground" itemProp="name">
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(index + 2)} />
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
