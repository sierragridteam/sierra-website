/**
 * Which news posts are press material. Pure, so /press, the post page and the tests agree.
 *
 * Two questions, deliberately separate:
 *  - `isPressRelease` — is this post the organization's own release, published as issued?
 *    Only the `Press Release` tag. Its page closes with the standing About + media-contact
 *    block (PressFoot).
 *  - `isPressItem` — does it belong in the list on /press? Releases, `Announcement` posts
 *    (organizational news a desk wrote up from a member's proposal), and any post that opts
 *    in with `press: true`.
 */
export const PRESS_RELEASE_TAG = 'Press Release';

/** Tags listed on /press without opting in. */
export const PRESS_TAGS: readonly string[] = [PRESS_RELEASE_TAG, 'Announcement'];

interface PressFields {
  tag?: string;
  press?: boolean;
}

export const isPressRelease = (post: PressFields): boolean => post.tag === PRESS_RELEASE_TAG;

export const isPressItem = (post: PressFields): boolean =>
  post.press === true || (post.tag !== undefined && PRESS_TAGS.includes(post.tag));
