export interface FooterLinkItem {
  id: string;
  label: string;
  url: string;
}

export interface FooterCapabilityItem {
  id: string;
  text: string;
}

export interface FooterConfig {
  brandDesc: string;
  founderName: string;
  founderRole: string;

  col1Title: string;
  col1Links: FooterLinkItem[];

  col2Title: string;
  col2Items: FooterCapabilityItem[];

  col3Title: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  mapLink: string;

  copyrightText: string;
  securityBadge: string;
}

