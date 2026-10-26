/**
 * Company details used across the site (footer, privacy policies, terms, contact).
 * Have a Nigerian lawyer check the legal pages and the regulatory line.
 */
export const company = {
  /** Registered company name, as on the CAC certificate. */
  legalName: 'Bridgewise Limited',
  /** CAC registration number. */
  rcNumber: '7043598',
  /** Registered office address. */
  address: 'No 7 Prince Ebenezer Street, Jakande, Bucknor, Isolo, Lagos 100263, Nigeria',
  /** General contact. */
  email: 'hello@lorapay.io',
  /** Privacy questions and data requests (NDPA); reaches the Data Protection Officer. */
  privacyEmail: 'privacy@lorapay.io',
  /** Security reports (also in public/.well-known/security.txt). */
  securityEmail: 'security@lorapay.io',
  /** Shown in the footer. */
  legalLine:
    'Lorapay is a product of Bridgewise Limited (RC 7043598). Lorapay is not yet open to the public. Customer money will be held through Anchor (Anchor Technologies) and its licensed partner banks, not by Lorapay.',
  /** Effective date of the privacy policies and terms. */
  policyDate: '26 October 2026',
  /**
   * Nigerian patent application number. Leave empty until the Registry's acknowledgement
   * arrives; once set, the footer shows "Patent pending" with this number.
   */
  patentApplication: '',
};
