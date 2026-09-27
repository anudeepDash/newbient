export const PREDEFINED_CITIES = [
    "Mumbai",
    "Delhi NCR",
    "Bengaluru",
    "Pune",
    "Hyderabad",
    "Chennai",
    "Kolkata",
    "Ahmedabad",
    "Goa",
    "Chandigarh",
    "Jaipur",
    "Kochi",
    "Indore",
    "Lucknow",
    "Guwahati",
    "Vizag",
    "Surat",
    "Shillong",
    "Bhubaneswar",
    "Cuttack",
    "Bhubaneswar & Cuttack",
    "Bhopal",
    "Kolhapur",
    "Pan-India / Remote",
    "Others"
];

export const ARTIST_CATEGORIES = [
    "Singer",
    "Band",
    "Anchor",
    "Standup Comedian",
    "Musician",
    "DJ",
    "Dancer",
    "Magician",
    "Speaker",
    "Photographer",
    "Videographer",
    "Others"
];

export const CREATOR_NICHES = [
    'City Pages',
    'College Pages',
    'Student/ Campus Creator',
    'Fashion & Luxury',
    'Tech & Gaming',
    'Travel & Lifestyle',
    'Beauty & Fitness',
    'Food & Beverage',
    'Comedy & Entertainment',
    'Music & Dance',
    'Fitness & Sports',
    'Real Estate',
    'Photography & Filmmaking',
    'Automotive & Moto',
    'Art & Design',
    'Parenting & Family',
    'Podcasts & Media',
    'Meme & Pop Culture',
    'Startup & Entrepreneurship',
    'Finance & Business',
    'Career',
    'Others'
];

export const CREATOR_NICHE_OPTIONS = [
    { id: 'City Pages', label: 'City Pages / Local Hubs' },
    { id: 'College Pages', label: 'College Pages / Hubs' },
    { id: 'Student/Campus Creator', label: 'Campus & College' },
    { id: 'Fashion & Luxury', label: 'Fashion & Luxury' },
    { id: 'Tech & Gaming', label: 'Tech & Gaming' },
    { id: 'Travel & Lifestyle', label: 'Travel & Lifestyle' },
    { id: 'Beauty & Fitness', label: 'Beauty & Cosmetics' },
    { id: 'Fitness & Sports', label: 'Fitness & Athletics' },
    { id: 'Food & Beverage', label: 'Food & Dining' },
    { id: 'Comedy & Entertainment', label: 'Comedy & Memes' },
    { id: 'Real Estate', label: 'Real Estate & Living' },
    { id: 'Photography & Filmmaking', label: 'Photo & Filmmaking' },
    { id: 'Automotive & Moto', label: 'Auto & Motovlogging' },
    { id: 'Art & Design', label: 'Art, Design & DIY' },
    { id: 'Music & Dance', label: 'Music & Dance' },
    { id: 'Parenting & Family', label: 'Parenting & Family' },
    { id: 'Podcasts & Media', label: 'Podcasts & Media' },
    { id: 'Meme & Pop Culture', label: 'Meme & Pop Culture' },
    { id: 'Startup & Entrepreneurship', label: 'Startup & Founder' },
    { id: 'Finance & Business', label: 'Finance & Career' },
    { id: 'Others', label: 'Other Specialization' }
];

export const DEFAULT_CREATOR_GROUPS = [
    {
        id: 'group_bengaluru',
        city: 'Bengaluru',
        platform: 'WhatsApp',
        title: 'Bengaluru Creators Community',
        groupUrl: 'https://chat.whatsapp.com/K6MtDAOlZ7s7AUtOFHxduU?mode=gi_t',
        description: 'Official Bengaluru hub for brand campaigns, concert access, nightlife drops & creator meetups.',
        isActive: true,
        order: 1
    },
    {
        id: 'group_hyderabad',
        city: 'Hyderabad',
        platform: 'WhatsApp',
        title: 'Hyderabad Creators Community',
        groupUrl: 'https://chat.whatsapp.com/FXxILbsZCd56WuqLcCnPWL?mode=gi_t',
        description: 'Official Hyderabad hub for live concert guestlists, nightlife drops, brand briefs & creator collaborations.',
        isActive: true,
        order: 2
    },
    {
        id: 'group_chandigarh',
        city: 'Chandigarh',
        platform: 'WhatsApp',
        title: 'Chandigarh Creators Community',
        groupUrl: 'https://chat.whatsapp.com/EUAFdJReG6V1E0YMEoru3f?mode=gi_t',
        description: 'Official Chandigarh & Tricity hub for festival invites, college activations, campus buzz & brand campaigns.',
        isActive: true,
        order: 3
    },
    {
        id: 'group_mumbai',
        city: 'Mumbai',
        platform: 'WhatsApp',
        title: 'Mumbai Creators Community',
        groupUrl: 'https://chat.whatsapp.com/KG041Lyo94yL5208nwvZMR?mode=gi_t',
        description: 'Official Mumbai entertainment, nightlife, luxury brands & commercial collaboration network.',
        isActive: true,
        order: 4
    },
    {
        id: 'group_pune',
        city: 'Pune',
        platform: 'WhatsApp',
        title: 'Pune Creators Community',
        groupUrl: 'https://chat.whatsapp.com/EhAnTjZOt2S1MpB6vu7ogh?mode=gi_t',
        description: 'Official Pune hub for music festivals, college circuit alerts, local brand missions & creator collabs.',
        isActive: true,
        order: 5
    },
    {
        id: 'group_kolkata',
        city: 'Kolkata',
        platform: 'WhatsApp',
        title: 'Kolkata Creators Community',
        groupUrl: 'https://chat.whatsapp.com/CcLTOGYIcOC3FTbVxfLHq6?mode=gi_t',
        description: 'Official Kolkata hub for art, cultural showcases, music festivals, food culture & live brand drops.',
        isActive: true,
        order: 6
    },
    {
        id: 'group_kochi',
        city: 'Kochi',
        platform: 'WhatsApp',
        title: 'Kochi Creators Community',
        groupUrl: 'https://chat.whatsapp.com/ELgsYWnoBavLHEzo3u1c63?mode=gi_t',
        description: 'Official Kochi & Kerala hub for live music events, creator meetups, regional brand deals & festival passes.',
        isActive: true,
        order: 7
    },
    {
        id: 'group_delhi',
        city: 'Delhi',
        platform: 'WhatsApp',
        title: 'Delhi NCR Creators Community',
        groupUrl: 'https://chat.whatsapp.com/DCScNxm2YRR4kbwpcYKI9R?mode=gi_t',
        description: 'Official Delhi NCR hub for mega arena tours, lifestyle campaigns, brand launches & creator networking.',
        isActive: true,
        order: 8
    },
    {
        id: 'group_bhubaneswar_cuttack',
        city: 'Bhubaneswar & Cuttack',
        platform: 'WhatsApp',
        title: 'Bhubaneswar & Cuttack Creators Community',
        groupUrl: 'https://chat.whatsapp.com/HCDsLDRRx9003R7cppRnYr?mode=gi_t',
        description: 'Official Odisha twin cities hub for college fests, cultural showcases, brand drops & creator meetups.',
        isActive: true,
        order: 9
    },
    {
        id: 'group_vizag',
        city: 'Vizag',
        platform: 'WhatsApp',
        title: 'Vizag Creators Community',
        groupUrl: 'https://chat.whatsapp.com/CLPSGxEpBgYHCDYE3s87sr?mode=gi_t',
        description: 'Official Vizag & Coastal Andhra hub for beach festivals, youth events, brand briefs & creator collaborations.',
        isActive: true,
        order: 10
    },
    {
        id: 'group_surat',
        city: 'Surat',
        platform: 'WhatsApp',
        title: 'Surat Creators Community',
        groupUrl: 'https://chat.whatsapp.com/FUV21rcnGxe0wDe9rSTK5f?mode=gi_t',
        description: 'Official Surat hub for fashion, lifestyle, food culture, brand drops & creator meetups.',
        isActive: true,
        order: 11
    },
    {
        id: 'group_ahmedabad',
        city: 'Ahmedabad',
        platform: 'WhatsApp',
        title: 'Ahmedabad Creators Community',
        groupUrl: 'https://chat.whatsapp.com/BLheHwuewyd20imXdSVWgJ?mode=gi_t',
        description: 'Official Ahmedabad & Gujarat hub for heritage drops, festivals, startup culture & brand campaigns.',
        isActive: true,
        order: 12
    },
    {
        id: 'group_jaipur',
        city: 'Jaipur',
        platform: 'WhatsApp',
        title: 'Jaipur Creators Community',
        groupUrl: 'https://chat.whatsapp.com/EOAGzmMX7dD8STN2gJvReR?mode=gi_t',
        description: 'Official Pink City hub for heritage, culture, art festivals, lifestyle brands & creator collaborations.',
        isActive: true,
        order: 13
    },
    {
        id: 'group_chennai',
        city: 'Chennai',
        platform: 'WhatsApp',
        title: 'Chennai Creators Community',
        groupUrl: 'https://chat.whatsapp.com/IhJGGdmyIHN2sN7aTks1HF?mode=gi_t',
        description: 'Official Chennai & Tamil Nadu hub for music, cinema culture, college festivals & brand collaborations.',
        isActive: true,
        order: 14
    }
];
