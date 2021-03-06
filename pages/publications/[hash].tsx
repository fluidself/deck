import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import wikiLinkPlugin from 'remark-wiki-link';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { IconExternalLink } from '@tabler/icons';
import { addEllipsis } from 'utils/string';
import { getReadableDatetime } from 'utils/date';
import PageLoading from 'components/PageLoading';

type Publication = {
  title: string;
  body: string;
  address: string;
  timestamp: number;
};

type Props = {
  publication: Publication;
};

export default function PublicationPage(props: Props) {
  const {
    publication: { address, timestamp, title, body },
  } = props;
  const router = useRouter();
  const { hash } = router.query;
  const [parsedBody, setParsedBody] = useState<string | null>(null);

  useEffect(() => {
    const process = async () => {
      const parsedBody = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(wikiLinkPlugin, { aliasDivider: '|' })
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeSanitize)
        .use(rehypeStringify)
        .processSync(body);

      setParsedBody(String(parsedBody));
    };

    process();
  }, [hash, address, timestamp, title, body]);

  if (!parsedBody) {
    return <PageLoading />;
  }

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <main className="mt-12 container mx-auto md:max-w-3xl publication">
        <h1 className="text-5xl font-semibold text-gray-100 mb-4">{title}</h1>
        <div className="flex space-x-4">
          <span className="text-xs inline-block py-1 px-2.5 leading-none text-center align-baseline bg-gray-800 text-gray-300 rounded">
            {addEllipsis(address)}
          </span>
          <span className="text-xs inline-block py-1 px-2.5 leading-none text-center align-baseline bg-gray-800 text-gray-300 rounded">
            {getReadableDatetime(timestamp)}
          </span>
        </div>

        <article
          className="prose prose-invert max-w-none mt-8 prose-table:border prose-table:border-collapse prose-th:border prose-th:border-gray-700 prose-th:align-baseline prose-th:pt-2 prose-th:pl-2 prose-td:border prose-td:border-gray-700 prose-td:pt-2 prose-td:pl-2 prose-a:text-primary-500 hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: parsedBody }}
        ></article>

        <div className="flex flex-col mt-20 mb-12 border border-gray-700 rounded text-gray-400 text-sm">
          <a className="hover:bg-gray-800" href={`https://ipfs.infura.io/ipfs/${hash}`} target="_blank" rel="noopener noreferrer">
            <div className="flex flex-row justify-between p-4 border-b border-gray-700">
              <div className="flex items-center">
                <span>IPFS HASH</span> <IconExternalLink className="ml-2" size={16} />
              </div>
              <div>{hash}</div>
            </div>
          </a>
          <a
            className="hover:bg-gray-800"
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex flex-row justify-between p-4">
              <div className="flex items-center">
                <span>ETHEREUM ADDRESS</span> <IconExternalLink className="ml-2" size={16} />
              </div>
              <div>{address}</div>
            </div>
          </a>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const hash = params?.hash;
  let publication: Publication | undefined;

  try {
    const res = await fetch(`https://${hash}.ipfs.infura-ipfs.io`);
    const data = await res.json();
    if (data) {
      publication = data;
    }
  } catch (e) {
    return {
      notFound: true,
    };
  }

  if (!publication) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      publication,
    },
  };
};
