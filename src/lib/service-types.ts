export interface ServiceCardData {
  image: string;
  title: string;
  text: string;
  href: string;
  alt?: string;
}

export interface ServiceStep {
  icon: string;
  title: string;
}

export interface ServiceSection {
  title: string;
  cards: ServiceCardData[];
}
