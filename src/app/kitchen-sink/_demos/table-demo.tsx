"use client"

import { DataTable, type DataTableColumn } from "@/components/patterns/data-table"
import { StatusPill, type JobStatusPill } from "@/components/patterns/status-pill"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontalIcon } from "lucide-react"

type DemoJob = {
  id: string
  title: string
  company: string
  status: JobStatusPill
  views: number
  applications: number
}

const ROWS: DemoJob[] = [
  { id: "1", title: "Senior Frontend Engineer", company: "Acme Corp", status: "live", views: 1284, applications: 17 },
  { id: "2", title: "Product Designer", company: "Northwind", status: "pending", views: 0, applications: 0 },
  { id: "3", title: "Platform Engineer", company: "Globex", status: "draft", views: 0, applications: 0 },
  { id: "4", title: "Growth Marketer", company: "Initech", status: "expired", views: 812, applications: 9 },
  { id: "5", title: "Data Analyst", company: "Umbrella", status: "rejected", views: 402, applications: 5 },
]

const COLUMNS: DataTableColumn<DemoJob>[] = [
  {
    key: "title",
    header: "Title",
    value: (row) => row.title,
    cell: (row) => (
      <div>
        <p className="font-medium">{row.title}</p>
        <p className="text-xs text-fg-muted">{row.company}</p>
      </div>
    ),
  },
  { key: "status", header: "Status", value: (row) => row.status, cell: (row) => <StatusPill status={row.status} /> },
  { key: "views", header: "Views", align: "right", value: (row) => row.views, cell: (row) => <span className="tabular">{row.views.toLocaleString()}</span> },
  { key: "applications", header: "Applications", align: "right", value: (row) => row.applications, cell: (row) => <span className="tabular">{row.applications}</span> },
  {
    key: "actions",
    header: "",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-lg" aria-label="Row actions">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export function TableDemo() {
  return (
    <DataTable
      columns={COLUMNS}
      rows={ROWS}
      getRowKey={(row) => row.id}
      initialSort={{ key: "views", dir: "desc" }}
    />
  )
}
