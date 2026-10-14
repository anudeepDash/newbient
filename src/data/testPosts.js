// Placeholder posts shown when no published blog posts exist yet.
// Kept in its own module so the home page can use them without pulling in the ConcertZoneBlog page.
export const TEST_POSTS = [
    {
        id: 'hello-world-test',
        title: 'Hello World',
        shortDescription: 'Welcome to ConcertZone — India\'s editorial hub for nightlife culture, artist deep-dives, and the stories behind the music scene.',
        content: '<h2>Welcome to ConcertZone</h2><p>This is the inaugural post of ConcertZone, India\'s definitive editorial destination for everything music, nightlife, and culture. We\'re building a platform where artists, fans, and the industry come together to share stories that matter.</p><h2>What to Expect</h2><p>From deep-dive artist profiles to venue guides, festival recaps to industry analysis — ConcertZone covers it all. Our editorial team is committed to delivering high-quality, well-researched content that goes beyond surface-level coverage.</p><h2>Join the Movement</h2><p>Whether you\'re an artist looking to share your story, a venue owner, or a passionate fan — ConcertZone is your home. Subscribe to our newsletter and never miss an update.</p>',
        coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=2000',
        videoUrl: 'https://cdn.pixabay.com/video/2019/11/15/29112-373979412_large.mp4',
        category: 'Live Events', status: 'Published', slug: 'hello-world',
        author: 'Newbi Editorial', publishDate: new Date().toISOString(), readingTime: 8, featured: true
    },
    {
        id: 'artist-spotlight-test',
        title: 'Artist Spotlight: The Underground Sound',
        shortDescription: 'A deep dive into the artists reshaping India\'s electronic music landscape.',
        content: '<h2>The Underground Revolution</h2><p>India\'s electronic music scene is undergoing a radical transformation. A new generation of producers and DJs are pushing boundaries, blending traditional Indian sounds with cutting-edge electronic production to create something entirely new.</p><h2>Artists to Watch</h2><p>From the bass-heavy sets of Mumbai\'s warehouse scene to the melodic techno emerging from Bangalore\'s underground clubs, these artists are defining what Indian electronic music sounds like in 2026.</p><p>Their approach is raw, unfiltered, and deeply personal — drawing from lived experience rather than following global trends.</p>',
        coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=2000',
        category: 'Artists', status: 'Published', slug: 'artist-spotlight',
        author: 'Newbi Editorial', publishDate: new Date(Date.now() - 86400000).toISOString(), readingTime: 6, featured: true
    },
    {
        id: 'venue-guide-test',
        title: 'The Complete Guide to Bangalore Nightlife',
        shortDescription: 'From hidden speakeasies to rooftop arenas — your essential blueprint to experiencing the best of Bangalore after dark.',
        content: '<h2>Bangalore After Dark</h2><p>Bangalore has evolved into India\'s nightlife capital, offering everything from intimate jazz bars to massive outdoor festivals. This guide covers the essential venues, the best nights to go out, and insider tips from the people who know the scene best.</p><h2>Top Venues</h2><p>Whether you\'re looking for a rooftop sundowner spot or a proper underground club, Bangalore has it all. We\'ve curated the definitive list of venues across the city, organized by vibe, music genre, and budget.</p><h2>Insider Tips</h2><p>The best nights aren\'t always the most advertised ones. Follow the right promoters, join the right WhatsApp groups, and you\'ll discover a whole hidden layer of Bangalore nightlife.</p>',
        coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=2000',
        category: 'Guides', status: 'Published', slug: 'bangalore-guide',
        author: 'Newbi Editorial', publishDate: new Date(Date.now() - 172800000).toISOString(), readingTime: 10, featured: false
    },
    {
        id: 'buzz-test',
        title: 'What\'s Buzzing This Week',
        shortDescription: 'Festival announcements, surprise collabs, and the hottest drops right now.',
        content: '<h2>This Week in Music</h2><p>It\'s been a massive week for the Indian music scene. Multiple festival lineups dropped, two major artist collaborations were announced, and a new venue just opened in Mumbai that\'s already getting rave reviews.</p><h2>Festival Season Updates</h2><p>With festival season approaching, organizers are pulling out all the stops. We\'ve got exclusive details on lineups, ticket pricing, and what to expect from this year\'s biggest events.</p>',
        coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000',
        category: 'Buzz', status: 'Published', slug: 'weekly-buzz',
        author: 'Newbi Editorial', publishDate: new Date(Date.now() - 259200000).toISOString(), readingTime: 4, featured: false
    },
    {
        id: 'live-event-recap',
        title: 'Recap: Sunburn Festival 2024',
        shortDescription: 'Everything that went down at this year\'s biggest electronic music festival.',
        content: '<h2>Sunburn 2024: A Recap</h2><p>Sunburn Festival returned bigger than ever this year, drawing over 100,000 attendees across three days of non-stop music. From the headlining acts to the hidden gem sets on smaller stages, here\'s our complete breakdown of everything that went down.</p><h2>Highlights</h2><p>The festival featured over 80 artists across 5 stages. The production quality was a significant step up from previous years, with state-of-the-art sound systems and immersive visual installations throughout the venue.</p><h2>The Verdict</h2><p>Sunburn 2024 proved that India\'s festival scene is maturing rapidly. The curation was sharper, the experience more polished, and the audience more engaged than ever before.</p>',
        coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=2000',
        category: 'Live Events', status: 'Published', slug: 'sunburn-recap',
        author: 'Newbi Editorial', publishDate: new Date(Date.now() - 345600000).toISOString(), readingTime: 7, featured: false
    }
];
