"use client"

import * as React from "react"
import {
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const CATEGORY_OPTIONS = [
  { value: "engineering", label: "Engineering" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
]

const TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border py-4 last:border-b-0">
      <span className="w-40 shrink-0 text-2xs font-medium tracking-wider text-fg-muted uppercase">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export function PrimitivesDemo() {
  // Radix Select 2.3: the trigger label is SelectValue's children (the
  // selected item's text only portals in after its content has opened once).
  const [type, setType] = React.useState("full-time")
  const typeLabel = TYPE_OPTIONS.find((option) => option.value === type)?.label

  return (
    <div className="divide-y divide-border rounded-lg border border-border px-6">
      <Row label="Button">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">
          <TrashIcon /> Destructive
        </Button>
        <Button variant="link">Link</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">
          <PlusIcon /> Large
        </Button>
        <Button disabled>Disabled</Button>
      </Row>

      <Row label="Badge / Avatar">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Avatar>
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>NI</AvatarFallback>
        </Avatar>
      </Row>

      <Row label="Input / Textarea">
        <Input placeholder="Email address" className="w-64" />
        <Input disabled placeholder="Disabled" className="w-48" />
        <Textarea placeholder="Job description (Markdown)" className="w-64" rows={3} />
      </Row>

      <Row label="Selection">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44" aria-label="Employment type">
            <SelectValue placeholder="Employment type">{typeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Combobox options={CATEGORY_OPTIONS} value="engineering" onValueChange={() => {}} placeholder="Category" />
        <Checkbox defaultChecked id="remote" aria-label="Remote only" />
        <Switch defaultChecked aria-label="Email alerts" />
      </Row>

      <Row label="Radio group">
        <RadioGroup defaultValue="basic" className="gap-2">
          {["basic", "standard", "featured"].map((plan) => (
            <div key={plan} className="flex items-center gap-2">
              <RadioGroupItem value={plan} id={`plan-${plan}`} />
              <Label htmlFor={`plan-${plan}`} className="capitalize">
                {plan}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </Row>

      <Row label="Overlay">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish this job?</DialogTitle>
              <DialogDescription>
                The job goes live immediately and appears in the public listing.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Publish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow the job list.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <p className="text-sm">A small floating panel — shadow allowed here (§5.1).</p>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Dropdown</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Row actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Edit <ChevronRightIcon className="ml-auto" />
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-lg" aria-label="Search jobs">
              <SearchIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search jobs</TooltipContent>
        </Tooltip>
        <Button
          variant="outline"
          onClick={() =>
            toast("Application received", { description: "The employer was notified." })
          }
        >
          Toast
        </Button>
      </Row>

      <Row label="Tabs / Card">
        <Tabs defaultValue="preview" className="w-64">
          <TabsList className="w-full">
            <TabsTrigger value="write" className="flex-1">
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="text-sm text-fg-muted">
            Markdown source
          </TabsContent>
          <TabsContent value="preview" className="text-sm text-fg-muted">
            Rendered preview
          </TabsContent>
        </Tabs>
        <Card className="w-64">
          <CardHeader>
            <CardTitle>Featured job</CardTitle>
            <CardDescription>Pinned to the top of the list for 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-fg-muted">
            Cards use borders, never shadows (§5.1).
          </CardContent>
        </Card>
      </Row>

      <Row label="Pagination">
        <Pagination className="justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Row>

      <Row label="Separator">
        <div className="flex w-64 items-center gap-4 text-sm text-fg-muted">
          <span>12 jobs</span>
          <Separator orientation="vertical" />
          <span>42 companies</span>
          <Separator orientation="vertical" />
          <span>Updated 2h ago</span>
        </div>
      </Row>
    </div>
  )
}
