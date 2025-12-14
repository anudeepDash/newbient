import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Mock Data
const initialAnnouncements = [];

const initialConcerts = [
    {
        id: 1,
        name: "Electric Dreams",
        date: "2025-04-10",
        venue: "Cyber Arena",
        price: 150,
        image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=2070&auto=format&fit=crop",
        category: "Electronic"
    },
    {
        id: 2,
        name: "Rock Revolution",
        date: "2025-05-20",
        venue: "The Stadium",
        price: 120,
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=2070&auto=format&fit=crop",
        category: "Rock"
    },
    {
        id: 3,
        name: "Jazz & Juice",
        date: "2025-04-25",
        venue: "Blue Note Hall",
        price: 80,
        image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=2070&auto=format&fit=crop",
        category: "Jazz"
    },
    {
        id: 4,
        name: "Pop Explosion",
        date: "2025-07-15",
        venue: "City Park",
        price: 100,
        image: "https://images.unsplash.com/photo-1459749411177-287ce5dec183?q=80&w=2070&auto=format&fit=crop",
        category: "Pop"
    }
];

const initialInvoices = [
    {
        id: "INV-001",
        clientName: "Acme Corp",
        email: "client@example.com",
        currency: "USD",
        amount: 5000,
        status: "Pending",
        dueDate: "2025-12-01",
        items: [
            { description: "Event Planning Services", quantity: 1, price: 2000 },
            { description: "Venue Rental", quantity: 1, price: 3000 }
        ]
    }
];

const initialSiteDetails = {
    phone: '+91 93043 72773',
    email: 'partnership@newbi.live',
    instagram: 'https://www.instagram.com/newbi_ent',
    linkedin: 'https://www.linkedin.com/company/newbi-ent/',
    whatsapp: 'https://wa.me/919304372773'
};

const initialGalleryImages = [
    { type: 'image', src: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2070&auto=format&fit=crop', title: 'Neon Nights Festival', category: 'Concert' },
    { type: 'image', src: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070&auto=format&fit=crop', title: 'Backstage Pass', category: 'Behind the Scenes' },
    { type: 'image', src: 'https://images.unsplash.com/photo-1514525253440-b393452e8d03?q=80&w=2070&auto=format&fit=crop', title: 'Rock Evolution', category: 'Concert' },
    { type: 'image', src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop', title: 'DJ Set Live', category: 'Electronic' },
    { type: 'image', src: 'https://images.unsplash.com/photo-1506157786151-b8491531f436?q=80&w=2070&auto=format&fit=crop', title: 'Crowd Energy', category: 'Festival' },
    { type: 'image', src: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070&auto=format&fit=crop', title: 'After Party', category: 'Events' },
    { type: 'video', src: 'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=2079&auto=format&fit=crop', title: 'Tour Highlights Reel', category: 'Video' },
    { type: 'poster', src: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop', title: 'Summer Fest Poster', category: 'Graphics' },
];

export const useStore = create(
    persist(
        (set) => ({
            announcements: initialAnnouncements,
            concerts: initialConcerts,
            invoices: initialInvoices,

            addAnnouncement: (announcement) => set((state) => ({
                announcements: [announcement, ...state.announcements]
            })),

            togglePinAnnouncement: (id) => set((state) => ({
                announcements: state.announcements.map(a =>
                    a.id === id ? { ...a, isPinned: !a.isPinned } : a
                ).sort((a, b) => (b.isPinned === a.isPinned ? 0 : b.isPinned ? 1 : -1))
            })),

            deleteAnnouncement: (id) => set((state) => ({
                announcements: state.announcements.filter(a => a.id !== id)
            })),

            // Portfolio / Past Events
            portfolio: [
                { id: 'm1', category: 'music', title: "Arijit Singh", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14" },
                { id: 'm2', category: 'music', title: "Marshmello", image: "https://images.unsplash.com/photo-1506157786151-b8491531f063" },
                { id: 'f1', category: 'fests', title: "Kingfisher OctoBeerfest", image: "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9" },
                // Add defaults as requested
                { id: 'c1', category: 'comedy', title: "Anubhav Singh Bassi", image: "https://images.unsplash.com/photo-1585672629633-84f55dbd7c0f" }
            ],
            addPortfolioItem: (item) => set((state) => ({
                portfolio: [...state.portfolio, item]
            })),
            deletePortfolioItem: (id) => set((state) => ({
                portfolio: state.portfolio.filter(i => i.id !== id)
            })),

            // Upcoming Concerts
            addConcert: (concert) => set((state) => ({
                concerts: [...state.concerts, concert]
            })),
            updateConcert: (id, updates) => set((state) => ({
                concerts: state.concerts.map(c => c.id === id ? { ...c, ...updates } : c)
            })),
            deleteConcert: (id) => set((state) => ({
                concerts: state.concerts.filter(c => c.id !== id)
            })),

            addInvoice: (invoice) => set((state) => ({
                invoices: [...state.invoices, invoice]
            })),

            updateInvoiceStatus: (id, status) => set((state) => ({
                invoices: state.invoices.map(inv =>
                    inv.id === id ? { ...inv, status } : inv
                )
            })),

            deleteInvoice: (id) => set((state) => ({
                invoices: state.invoices.filter(inv => inv.id !== id)
            })),

            // Forms System
            forms: [],
            addForm: (form) => set((state) => ({ forms: [...state.forms, form] })),
            updateForm: (id, updates) => set((state) => ({
                forms: state.forms.map(f => f.id === id ? { ...f, ...updates } : f)
            })),
            deleteForm: (id) => set((state) => ({
                forms: state.forms.filter(f => f.id !== id)
            })),
            // Submissions are now handled by Google Forms, so we don't need local storage for them.

            // CMS Actions
            siteDetails: initialSiteDetails,
            updateSiteDetails: (details) => set((state) => ({
                siteDetails: { ...state.siteDetails, ...details }
            })),

            galleryImages: initialGalleryImages,
            addGalleryImage: (image) => set((state) => ({
                galleryImages: [image, ...state.galleryImages]
            })),
            removeGalleryImage: (index) => set((state) => ({
                galleryImages: state.galleryImages.filter((_, i) => i !== index)
            })),
        }),
        {
            name: 'newbi-storage',
            getStorage: () => localStorage,
        }
    )
);
