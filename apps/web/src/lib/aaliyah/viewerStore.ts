import { create } from 'zustand'

export type DocumentType = 'pdf' | 'sheet' | 'image' | 'unknown'

export interface ActiveDocument {
    id: string
    url: string
    name: string
    type: DocumentType
    // Additional metadata depending on document type
    mimeType?: string
    size?: number
}

interface ViewerState {
    isViewerOpen: boolean
    activeDocument: ActiveDocument | null

    openDocument: (doc: ActiveDocument) => void
    closeViewer: () => void
    toggleViewer: () => void
}

export const useViewerStore = create<ViewerState>((set) => ({
    isViewerOpen: false,
    activeDocument: null,

    openDocument: (doc) => set({ isViewerOpen: true, activeDocument: doc }),
    closeViewer: () => set({ isViewerOpen: false, activeDocument: null }),
    toggleViewer: () => set((state) => ({ isViewerOpen: !state.isViewerOpen }))
}))
