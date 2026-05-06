export async function getServerSideProps() {
  return { redirect: { destination: '/standup', permanent: false } };
}
export default function Home() { return null; }
