/*
 * The community welcome form's choices (JoinCommunitySheet), shared with the
 * admin's member sheet so both name them the same way.
 */

export const CITIES = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Goa', 'Jaipur', 'Chandigarh', 'Kochi'];

export const INTERESTS = [
    { id: 'backstage', label: 'Backstage & artist crew' },
    { id: 'promotions', label: 'Promotions' },
    { id: 'volunteering', label: 'Volunteering at shows' },
    { id: 'guestlists', label: 'Guestlists & giveaways' },
    { id: 'gaming', label: 'Gaming' },
];

export const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

export const interestLabel = (id) => INTERESTS.find(i => i.id === id)?.label || id;
