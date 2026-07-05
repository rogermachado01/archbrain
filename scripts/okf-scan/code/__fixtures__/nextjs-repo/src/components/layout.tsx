import Link from 'next/link';
import type { Footer } from './footer';
import { Header } from './header';
import { formatDate } from '../lib/helpers';
import { SomeWidget } from 'some-external-ui-lib';

export function Layout() {
  formatDate('2026-01-01');
  return (
    <div>
      <Header />
      <SomeWidget />
      <Link href="/about">About</Link>
      <Link href="/deeply/nested/missing">Missing</Link>
    </div>
  );
}

export function navigate(router: { push: (path: string) => void }, slug: string) {
  router.push('/some-post');
  router.push(`/blog/${slug}`);
}
