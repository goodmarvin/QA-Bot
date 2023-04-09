import type { CheerioAPI, load as LoadT } from 'cheerio';
import { Document } from 'langchain/document';
import { BaseDocumentLoader } from 'langchain/document_loaders';
import type { DocumentLoader } from 'langchain/document_loaders';
import { CheerioWebBaseLoader } from 'langchain/document_loaders';

function findTitle($: CheerioAPI): string {
  const titleCandidates = ['h1', 'h2', 'title'];

  for (const candidate of titleCandidates) {
    const title = $(candidate).first().text();
    if (title.trim()) {
      return title.trim();
    }
  }

  return '';
}

function findContent($: CheerioAPI): string {
  const contentCandidates = ['main', 'article', 'div', 'section'];

  for (const candidate of contentCandidates) {
    const content = $(candidate).first().text();
    if (content.trim()) {
      return content.trim();
    }
  }

  return '';
}

export class CustomWebLoader
  extends BaseDocumentLoader
  implements DocumentLoader
{
  constructor(public webPath: string) {
    super();
  }

  static async _scrape(url: string): Promise<CheerioAPI> {
    const { load } = await CustomWebLoader.imports();
    const response = await fetch(url);
    const html = await response.text();
    return load(html);
  }

  async scrape(): Promise<CheerioAPI> {
    return CustomWebLoader._scrape(this.webPath);
  }

  async load(): Promise<Document[]> {
    const $ = await this.scrape();
    const title = findTitle($);
    const date = $('meta[property="article:published_time"]').attr('content');
    const content = findContent($);

    const cleanedContent = content.replace(/\s+/g, ' ').trim();
    const contentLength = cleanedContent?.match(/\b\w+\b/g)?.length ?? 0;

    const metadata = { source: this.webPath, title, date, contentLength };

    return [new Document({ pageContent: cleanedContent, metadata })];
  }

  static async imports(): Promise<{
    load: typeof LoadT;
  }> {
    try {
      const { load } = await import('cheerio');
      return { load };
    } catch (e) {
      console.error(e);
      throw new Error(
        'Please install cheerio as a dependency with, e.g. `yarn add cheerio`',
      );
    }
  }
}
