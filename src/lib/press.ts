/**
 * Which news posts are press material. Pure, so /press, the post page and the tests agree.
 *
 * Two questions, deliberately separate:
 *  - `isPressRelease` — is this post the organization's own release, published as issued?
 *    Only the `Press Release` tag. Its page closes with the standing About + media-contact
 *    block (PressFoot).
 *  - `isPressItem` — does it belong in the list on /press? Releases and `Announcement`
 *    posts (organizational news a desk wrote up from a member's proposal) by default; a
 *    post's own `press: true | false` overrides the default either way — `true` for
 *    organizational news filed under another tag, `false` for a desk write-up of news the
 *    release itself now covers.
 */
export const PRESS_RELEASE_TAG = 'Press Release';

/** Tags listed on /press unless the post opts out. */
export const PRESS_TAGS: readonly string[] = [PRESS_RELEASE_TAG, 'Announcement'];

interface PressFields {
  tag?: string;
  press?: boolean;
}

export const isPressRelease = (post: PressFields): boolean => post.tag === PRESS_RELEASE_TAG;

export const isPressItem = (post: PressFields): boolean =>
  post.press ?? (post.tag !== undefined && PRESS_TAGS.includes(post.tag));
