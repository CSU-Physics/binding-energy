import React from "react";
import CustomButton from "../CustomButton"
import CustomInput from "../CustomInput"
import { useState } from "react";
import { useGlobalState } from "../Context";
import { useNavigate } from "react-router-dom";
const Hero = () => {
    const nav = useNavigate()
    const [error1, setError1] = useState(false)
    const [error2, setError2] = useState(false)

    const [errMsg1, setErrMsg1] = useState("");
    const [errMsg2, setErrMsg2] = useState("");

    const {
        Z,
        setZ,
        N,
        setN,
    } = useGlobalState();


    const onClick = () => {
        if (Z >= 0 && N >= 0) {
            setError1(false);
            setError2(false);
            nav('/calulations')

        }
        if (Z < 0) {
            setErrMsg1("Number cannot be negative!")
            setError1(true);
        }
        if (N < 0) {
            setErrMsg2("Number cannot be negative!")
            setError2(true);
        }
        if (String(Z) === "e") {
            setErrMsg1("Input must be a number!")
            setError1(true);
        }
        if (String(N) === "e") {
            setErrMsg2("Input must be a number!")
            setError2(true);
        }
        console.log(Z)
    }


    const enterListenHandler = event => {
        if (event.key === "Enter") {
            console.log("Enter key pressed!");
            onClick()
        }
    };


    return (
        <div className=" flex flex-col items-center text-black bg-white text-lg pt-10 w-11/12 lg:w-full p-3" >
            {/* lg:w-[900px] sm:w-fit */}
            <div className=" md:w-[700px] lg:w-[900px]">

                <h1 className="text-start text-lg lg:text-2xl md:text-xl" >Nuclear Binding Energy Calculator</h1>
                <br />
                <p className="text-wrap leading-[25px]" >
                    This website provides a user-friendly tool for calculating the binding energy of any specified nuclide.
                    Users can input the number of protons and neutrons, and the website will then verify the existence of the nuclide in the IAEA-NDS database.
                    If the nuclide is found, the website presents its binding energy calculated using two distinct methods: 1.)
                    The Mass Defect Approach: This method calculates the binding energy by determining the mass difference between the nuclide and its constituent protons and neutrons. 2.) The Liquid Drop Model: This is a semi-empirical formula that estimates the binding energy of a nucleus, taking into account the number of protons and neutrons it contains.
                </p>
                <br />
            </div>

            <div className="mb-0 ">

                <div className={error1 || error2 ? "w-[350px] h-[310px] flex flex-col bg-[#6f263d] shadow-2xl p-8 py-4 items-center text-white rounded-md" : "w-[350px] h-[250px] flex flex-col bg-[#6f263d] shadow-2xl p-8 py-4 items-center text-white rounded-md"} >
                    <p className="my-3 font-bold" >Enter Nuclide Properties:</p>
                    <CustomInput placeholder={"Enter the number of protons (Z)"} value={Z} onChange={({ target }) => { setZ(parseInt(target.value).toFixed(0)) }} error={error1} error_message={errMsg1} onKeyDown={enterListenHandler} />
                    <CustomInput placeholder={"Enter the number of neutrons (N)"} value={N} onChange={({ target }) => { setN(parseInt(target.value).toFixed(0)) }} error={error2} error_message={errMsg2} onKeyDown={enterListenHandler} />
                    <CustomButton title={"Calculate"} onClick={() => onClick()} />
                </div>
            </div>

            <div className="md:w-[700px] lg:w-[900px] my-8">
                {/* <div className="w-[900px] m-16 my-8"> */}
                <h1 className="text-start text-2xl" >
                    What is Nuclear Binding Energy?
                </h1>
                <br />
                <p className="text-wrap leading-[25px]" >
                    Nuclear Binding Energy is the energy required to break a nucleus into its constituent nucleons (protons and neutrons),
                    or the energy released when these nucleons combine to form a nucleus. This process involves a phenomenon known as the "mass defect,"
                    where the mass of a nucleus is actually less than the total mass of its constituent nucleons. According to Einstein's mass-energy equivalence principle,
                    the difference in mass translates into the binding energy of the nucleus.
                </p>
                <br />
                <p className="text-wrap leading-[25px]">
                    Example: The hydrogen-2 nucleus, also called a deuteron,
                    is the simplest kind of nucleus with one proton and one neutron,
                    requires an input of 2.23 million electron volts (MeV) energy to disassemble.
                    In contrast, when a neutron and proton come together to create a deuteron, 2.23 MeV of energy is released as gamma radiation.
                </p>
                <br />
                <p className="text-wrap leading-[25px]">
                    The Nuclear Binding Energy per nucleon is the average energy needed to detach a single nucleon from the nucleus.
                    It varies across different elements, with hydrogen-2 having an average of 1.11226 MeV per nucleon,
                    while nickel-62 has about 8.7945 MeV per nucleon. This measure gives insight into the stability of a nucleus: the higher the binding energy per nucleon,
                    the more stable the nucleus.
                </p>

                <div className=" m-6 flex flex-col items-center justify-center" >
                    <img src={require("./Binding-Energy_per-Nucleon.jpg")} className="w-[608px] h-[458px] self" />
                    <p className=" text-sm text-center text-red-500 font-semibold">This graph displays the binding energy per nucleon (BE/A) in MeV plotted against the total number of nucleons (A) for 3,357 nuclides. The data for this plot are sourced from the <a className="text-sm text-blue-400 font-semibold" href="https://nds.iaea.org/" target="blank" >IAEA Nuclear Data Services</a> and can be downloaded along with the XmGrace file via the following links:</p>
                    <div className="flex flex-col text-sm text-blue-400 font-semibold text-center" >
                        <a target="blank"  href="https://github.com/CSU-Physics/binding-energy/blob/main/BE_A.data" >Data: BE_A.data</a>
                        <a target="blank" className=" to-blue-300" href="https://github.com/CSU-Physics/binding-energy/blob/main/BE_A.agr" >XmGrace file: BE_A.agr</a>
                    </div>

                </div>


            </div>

        </div>
    )
}
export default Hero;