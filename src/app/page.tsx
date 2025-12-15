import Header from "./components/Header";
import Banner from "./components/Banner";
import Product from "./components/Product";
import Footer from "./components/Footer";
import Seller from "./components/Seller";
import SubHeader from "./components/SubHeader";
import { Suspense } from "react";

export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <SubHeader />
      <main className="mt-5">
        <Banner />
        <div className="mt-25"></div>
        <Product />
        <div className="mt-25"></div>
        <Seller />
      </main>
      <div className="mt-25"></div>
      <Footer />
    </>
  );
}
