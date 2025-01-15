'use client'

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Search, Plus, MoreVertical, FolderPlus, Save, Folder, Tag, History, Filter, SortAsc, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from "react"
import { Collection, Folder as FolderType, SavedRequest } from "@/types"
import { toast } from "sonner"
import { v4 as uuidv4 } from 'uuid';

// Extended interfaces for new features
interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Version {
  id: string;
  number: string;
  timestamp: string;
  changes: string;
}

interface CollectionWithMeta extends Collection {
  tags?: Tag[];
  versions?: Version[];
  lastModified?: string;
}

interface CollectionsPanelProps {
  collections: Collection[]
  onSelectRequest: (request: SavedRequest) => void
  onSaveRequest: (collectionId: string, request: Partial<SavedRequest>) => void
  onCreateCollection: (collection: Partial<Collection>) => void
  onCreateFolder: (collectionId: string, folder: Partial<FolderType>) => void
  onDeleteCollection: (collectionId: string) => void
  onDeleteFolder: (collectionId: string, folderId: string) => void
  onDeleteRequest: (collectionId: string, requestId: string) => void
}

export function CollectionsPanel({
  collections,
  onSelectRequest,
  onSaveRequest,
  onCreateCollection,
  onCreateFolder,
  onDeleteCollection,
  onDeleteFolder,
  onDeleteRequest,
}: CollectionsPanelProps) {
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
  const [filterBy, setFilterBy] = useState<string>('')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    tags: [] as Tag[],
  })

  // New state for version control
  const [versions, setVersions] = useState<Record<string, Version[]>>({})

  const handleCreateCollection = () => {
    if (!newCollection.name) {
      toast.error('Collection name is required')
      return
    }

    const collection: Partial<CollectionWithMeta> = {
      id: Date.now().toString(),
      name: newCollection.name,
      description: newCollection.description,
      folders: [],
      requests: [],
      tags: newCollection.tags,
      versions: [{
        id: uuidv4(),
        number: '1.0.0',
        timestamp: new Date().toISOString(),
        changes: 'Initial version'
      }],
      lastModified: new Date().toISOString()
    }

    onCreateCollection(collection)
    setNewCollection({ name: '', description: '', tags: [] })
    setIsCreateOpen(false)
    toast.success('Collection created successfully')
  }

  const handleCreateFolder = (collectionId: string, parentFolderId?: string) => {
    const name = prompt('Enter folder name:')
    if (name) {
      const newFolder = { 
        id: uuidv4(),
        name, 
        folders: [], 
        requests: [],
        parentId: parentFolderId 
      }
      onCreateFolder(collectionId, newFolder)
      toast.success('Folder created successfully')
    }
  }

  const handleAddTag = (collectionId: string) => {
    const name = prompt('Enter tag name:')
    if (name) {
      const tag = {
        id: uuidv4(),
        name,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }
      // Update collection tags
      toast.success('Tag added successfully')
    }
  }

  const handleCreateVersion = (collectionId: string) => {
    const currentVersions = versions[collectionId] || []
    const lastVersion = currentVersions[0]?.number || '0.0.0'
    const newVersion = {
      id: uuidv4(),
      number: incrementVersion(lastVersion),
      timestamp: new Date().toISOString(),
      changes: 'New version'
    }
    setVersions({
      ...versions,
      [collectionId]: [newVersion, ...currentVersions]
    })
    toast.success('New version created')
  }

  const incrementVersion = (version: string): string => {
    const parts = version.split('.').map(Number)
    parts[2] += 1
    return parts.join('.')
  }

  const renderCollectionHeader = (collection: Collection) => {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-200" />
          <span className="text-sm font-medium text-gray-700">
            {collection.name}
          </span>
          {(collection as CollectionWithMeta).tags?.map(tag => (
            <span
              key={tag.id}
              className="collection-tag"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Collection Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleCreateFolder(collection.id)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddTag(collection.id)}>
              <Tag className="mr-2 h-4 w-4" />
              Add Tag
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSaveRequest(collection.id, {})}>
              <Save className="mr-2 h-4 w-4" />
              Save Request
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteCollection(collection.id)}
              className="text-red-600"
            >
              Delete Collection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const renderFolder = (collectionId: string, folder: FolderType, level = 0) => (
    <div 
      className="collection-folder group" 
      key={folder.id}
      style={{ paddingLeft: `${level * 16}px` }}
    >
      <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{folder.name}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={() => handleCreateFolder(collectionId, folder.id)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSaveRequest(collectionId, {})}>
              <Save className="mr-2 h-4 w-4" />
              Add Request
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDeleteFolder(collectionId, folder.id)}
              className="text-red-600"
            >
              Delete Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="pl-4 border-l border-gray-100 ml-3 mt-1">
        {folder.folders.map(subFolder => renderFolder(collectionId, subFolder, level + 1))}
        {folder.requests.map(request => renderRequest(collectionId, request, level + 1))}
      </div>
    </div>
  )

  const renderRequest = (collectionId: string, request: SavedRequest, level = 0) => (
    <div 
      className="collection-item group" 
      key={request.id}
      style={{ paddingLeft: `${level * 16}px` }}
    >
      <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50">
        <div 
          className="flex items-center gap-2 min-w-0 flex-1"
          onClick={() => onSelectRequest(request)}
        >
          <Badge 
            variant="outline" 
            className={`method-${request.method.toLowerCase()} shrink-0`}
          >
            {request.method}
          </Badge>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-700 truncate">
              {request.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {request.url}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteRequest(collectionId, request.id)}
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const handleSaveRequest = (collectionId: string) => {
    onSaveRequest(collectionId, {})
  }

  const handleDeleteCollection = (collectionId: string) => {
    if (confirm('Are you sure you want to delete this collection?')) {
      onDeleteCollection(collectionId)
      toast.success('Collection deleted successfully')
    }
  }

  const sortedCollections = [...collections].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    }
    return 0
  })

  const filteredCollections = sortedCollections.filter(collection => 
    collection.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Directory</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Collection Name"
                    value={newCollection.name}
                    onChange={(e) => setNewCollection(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Description (optional)"
                    value={newCollection.description}
                    onChange={(e) => setNewCollection(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCollection}>Create Collection</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy(sortBy === 'name' ? 'date' : 'name')}
            className="text-xs h-8 px-3 gap-1.5"
          >
            <SortAsc className="h-3 w-3" />
            {sortBy === 'name' ? 'Name' : 'Date'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 px-3 gap-1.5"
              >
                <Filter className="h-3 w-3" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilterBy('')}>
                All Requests
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('GET')}>
                GET Requests
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('POST')}>
                POST Requests
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search collections"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 bg-gray-100"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCollections.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No collections found
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredCollections.map((collection) => (
                <AccordionItem
                  key={collection.id}
                  value={collection.id}
                  className="border rounded-lg overflow-hidden group"
                >
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50">
                    {renderCollectionHeader(collection)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="py-2">
                      {collection.folders.map((folder) => renderFolder(collection.id, folder))}
                      {collection.requests.map((request) => renderRequest(collection.id, request))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

