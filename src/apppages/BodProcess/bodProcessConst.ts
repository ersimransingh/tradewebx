'use client'
import apiService from "@/utils/apiService"
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants"


export const bodProcessGetApiCall = async (setBodProcessApiData, userId, userType,setLoading) => {


    const xml =
        `<dsXml>                
    <J_Ui>"ActionName":"${ACTION_NAME}","Option":"GetBODData","RequestFrom":"W"</J_Ui>\n
    <Sql/>
    <X_Filter></X_Filter>
    <J_Api>"UserId":"${userId}","AccYear":24,"MyDbPrefix":"SVVS","MenuCode":7,"ModuleID":0,"MyDb":null,"DenyRights":null,"UserType":"${userType}"</J_Api>
    </dsXml>`

    try {

        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xml)
        const apiData = response?.data?.data?.rs0
        if (apiData) setBodProcessApiData(apiData)
        else setLoading(false)

    } catch (error) {
        console.error(error)
    }finally{
        setLoading(false)
    }
}


export const bodProcessIndividualApiCall = async (rowValue, showValidationMessage, setLoading, userId, userType) => {
    setLoading(true)

    const xmlData =
        `<dsXml>
    <J_Ui>"ActionName":"${ACTION_NAME}","Option":"RunBOD","Level":1,"RequestFrom":"W"</J_Ui>
    <Sql></Sql>
    <X_Filter>
    <ProcessName>${rowValue}</ProcessName>
    </X_Filter>
    <J_Api>"UserId":"${userId}","UserType":"${userType}","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined"</J_Api>
    </dsXml>`

    try {
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData)

        const apiData = response?.data?.data?.rs0[0]
        const errorMessage = apiData?.["Error Message"];
        const flagStatus = apiData?.ErrorFlag
        if (apiData) {
            showValidationMessage(errorMessage, flagStatus)
            setLoading(false)
        }



    } catch (error) {
        console.error(error)
    }


}






