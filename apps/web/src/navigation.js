// Stripe's return marker is consumed by driver onboarding, not a posting URL.
// Preserve language/search context and fragments when leaving that flow.
export function withoutDriverReturn(value,base='https://ridely.ca'){
 const url=new URL(value,base);url.searchParams.delete('driver-verification');
 return url.pathname+url.search+url.hash;
}
