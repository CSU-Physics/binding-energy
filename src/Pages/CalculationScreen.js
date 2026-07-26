
import React, { useEffect, useState } from "react";
import {
    mass_of_proton,
    mass_of_neutron,
    mass_of_electron,
    aV,
    aS,
    aC,
    aA,
    aP,
    conversion_amu_MeV
} from "../Functions/constants.js";
import {
    BE_func,
    mass_defect_func,
    splitElementName,
    liquid_drop_model,
    elements
} from "../Functions/index.js";
import { useGlobalState } from "../Components/Context.js";
import Typed from 'react-typed';
import IsotopeNotFound from "./IsotopeNotFound.js";
import { FaArrowLeft } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import IsotopeCannotBeCal from './IsotopeCannotBeCal.js';
import { getNuclide } from "../Services/nuclideData.js";

const CalulationScreen = () => {
    const [data, setData] = useState(undefined);
    const [loadError, setLoadError] = useState(null);
    const nav = useNavigate();
    const {
        Z,
        N
    } = useGlobalState();

    useEffect(() => {
        let active = true;

        setData(undefined);
        setLoadError(null);

        getNuclide(Number(Z), Number(N))
            .then((nuclide) => {
                if (active) {
                    setData(nuclide);
                }
            })
            .catch((error) => {
                if (active) {
                    setLoadError(error);
                }
            });

        return () => {
            active = false;
        };
    }, [Z, N]);

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#6f263d] text-white p-8">
                <h1 className="text-3xl font-semibold text-center">
                    Unable to load the nuclear dataset
                </h1>
                <p className="mt-4 text-center">{loadError.message}</p>
                <button
                    type="button"
                    className="mt-6 bg-white text-[#6f263d] px-6 py-3 rounded"
                    onClick={() => nav('/')}
                >
                    Go back
                </button>
            </div>
        );
    }

    if (data === undefined) {
        return (
            <div className="flex flex-row items-center justify-center h-screen bg-[#6f263d] " >
                <div className="m-2 mb-3 self-center">
                    {/* <h1 className=" text-white text-3xl font-semibold ">Calculating<Typed className=" text-white text-3xl font-semibold " strings={["..."]} typeSpeed={120} backSpeed={140} loop /></h1> */}
                    {/* <h1 className=" text-white text-3xl font-semibold ">Calculating<Typed className=" text-white text-3xl font-semibold " strings={["..."]} typeSpeed={120} backSpeed={140} loop /></h1> */}
                    <h1 className=" text-white text-3xl font-semibold animate-bounce text-center"> Nuclide Search and Binding Energy Calculation <Typed className=" text-white text-3xl font-semibold " strings={["..."]} typeSpeed={120} backSpeed={140} loop /></h1>
                </div>
            </div>
        )
    }

    if (data === null) {
        return (
            <IsotopeNotFound />
        )
    }

    const atomic_mass = data.atomicMassU;
    const atomic_number = data.z;
    const neutron_number = data.n;
    const element = elements(data.symbol) + "-" + (atomic_number + neutron_number);
    const elementName = splitElementName(element);
    const mass_number = atomic_number + neutron_number;
    
    if (
        data.atomicMassU === null ||
        data.bindingEnergyPerNucleonMeV === null
    ) {
        const name = `${elements(data.symbol)}-${mass_number}`;

        return (
            <IsotopeCannotBeCal element={name} z ={atomic_number} n ={neutron_number}  />
        )
    }


    return (
        <>
            <div className="grid grid-cols-2 p-0 h-screen " >

                {/* Mass Defect */}
                <div className="bg-[#6f263d] text-white p-6 px-0 items-center " >

                    <div className="grid grid-cols-2">

                        <div className="mr-2" >
                            <FaArrowLeft size={60} className="w-[55px] h-[45px] p-2" onClick={() => {
                                nav('/')
                            }} />
                        </div>
                        <h1 className=" text-end text-5xl font-bold" >{elementName[0]}</h1>
                        <br />
                        <h1 className=" text-end text-5xl font-bold" > Z = {atomic_number}  </h1>

                    </div>


                    <h2 className=" text-center text-2xl mb-2 font-semibold mt-12"  > The Mass Defect Approach</h2>

                    <p className="text-wrap md:text-xl sm:text-sm m-4 mx-8 font-normal lg:leading-[40px] md:leading-[30px]">
                        Binding Energy (B.E.) = Δm c<sup>2</sup>
                        <br />
                        Mass Defect: Δm = [ Z (m<sub>p</sub> + m<sub>e</sub>) + N m<sub>n</sub> ] - m<sub>atom</sub>
                        <br />
                        Mass of Proton: m<sub>p</sub> = {mass_of_proton} amu
                        <br />
                        Mass of Neutron: m<sub>n</sub> = {mass_of_neutron} amu
                        <br />
                        Mass of Electron: m<sub>e</sub> = {mass_of_electron} amu
                        <br />
                        Mass of Nuclide: m<sub>atom</sub> = {atomic_mass} amu
                        <br />
                        Conversion Factor: 1 amu = {conversion_amu_MeV} MeV/c<sup>2</sup>
                        <br />
                        <hr className="hey-that’s-my-line" />
                        Δm = {mass_defect_func(atomic_mass, atomic_number, neutron_number).toFixed(4)} amu
                        <br />
                        B.E. = {BE_func(atomic_mass, atomic_number, neutron_number).toFixed(4)} MeV
                        <br />
                        B.E. per nucleon (B.E./A): {(BE_func(atomic_mass, atomic_number, neutron_number) / mass_number).toFixed(4)} MeV
                        <br />
                        <hr className="hey-that’s-my-line" />
                        IAEA-NDS (B.E./A): {data.bindingEnergyPerNucleonMeV.toFixed(4)} MeV
                    </p>
                </div>

                {/* Liquid Drop Model */}
                <div className="bg-white text-[#6f263d] p-6 px-0 justify-center " >
                    <h1 className=" text-start text-5xl font-bold">{elementName[1]}</h1>
                    <h1 className=" text-start text-5xl font-bold" > N = {neutron_number} </h1>

                    <h2 className=" text-center text-2xl font-semibold mb-2  mt-12" > The Liquid Drop Model</h2>
                    <p className="text-wrap md:text-xl sm:text-sm m-4 mx-8 font-normal lg:leading-[40px] md:leading-[30px]">
                        B.E. = a<sub>V</sub>A - a<sub>S</sub>A<sup>2/3</sup> - a<sub>c</sub>Z(Z-1)/A<sup>1/3</sup> - a<sub>A</sub>(A-2Z)<sup>2</sup>/A ± a<sub>P</sub>/A<sup>1/2</sup>
                        <br />
                        Volume term coefficient: a<sub>V</sub> = {aV} MeV
                        <br />
                        Surface term coefficient: a<sub>S</sub> = {aS} MeV
                        <br />
                        Coulomb term coefficient: a<sub>C</sub> = {aC} MeV
                        <br />
                        Asymmetry term coefficient: a<sub>A</sub> = {aA} MeV
                        <br />
                        Pairing term coefficient: a<sub>P</sub> = {aP} MeV
                        <br />
                        <hr className="hey-that’s-my-line" />
                        B.E.: {liquid_drop_model(atomic_number, neutron_number).toFixed(4)} MeV
                        <br />
                        B.E./A: {(liquid_drop_model(atomic_number, neutron_number) / mass_number).toFixed(4)} MeV
                        <br />
                        <hr className="hey-that’s-my-line" />
                        IAEA-NDS (B.E./A): {data.bindingEnergyPerNucleonMeV.toFixed(4)} MeV
                    </p>
                </div>
            </div>

        </>
    )
}
export default CalulationScreen;
