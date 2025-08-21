import { useTheme } from "@/context/ThemeContext";

const AccessRight = () => {

    const { colors } = useTheme();

    return(
        <>
        <div
            style={{
                background: colors?.background || '#f0f0f0',
                color: colors?.text || '#000',
                minHeight: '100vh',
                padding: '20px',
            }}
            className="w-full"
        >
            <div className="border-b border-grey-500 flex items-center gap-5">
                <button
                    className="px-4 py-2 text-sm rounded-t-lg font-bold bg-[#3EB489] mt-2"
                    style={{ backgroundColor: 'white' }}
                >
                    Access Rights
                </button>
            </div>
            </div>
        </>
    )
}


export default AccessRight