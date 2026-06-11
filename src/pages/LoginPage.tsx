import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import loginBg from '@/assets/image/loginBg.jpg'
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useModal } from "@/contexts/ModalContext";

const LoginPage = () => {
    const navigate = useNavigate()

    const {login} = useAuth()
    const {openModal} = useModal()
    const [formData, setFormData] = useState({loginId:"", password:""})

    const handleChange = (e) => {
        //console.log(e.target)
        const {name, value} = e.target;
        setFormData((prev)=>({...prev, [name]:value}))
    }

    const handleLogin = async (e) => {
        e.preventDefault();// 페이지 새로고침 방지 
        
        //console.log('로그인 직전',formData)

        try {
            await login({
                loginId: formData.loginId,
                password: formData.password,
            });

            openModal({title:"로그인", content:"로그인 성공!", onConfirm:()=> navigate("/manage/user")})
        }catch (err) {
            console.error("Login Error:",err)
            alert("로그인 정보가 올바르지 않습니다.")
        }
    }

    const saveLogin = async (e) => {

    }

    return (
        <Wrapper>
        <Overlay />
        <Grid>
            <Header>
            <Title>하나드림타운 스마트플랫폼</Title>
            <Description>아이디와 비밀번호를 입력하세요.</Description>
            </Header>

            <Form onSubmit={handleLogin}>
            <FormGroup>
                <Input
                type="text"
                name="loginId"
                placeholder="id"
                value={formData.loginId}
                onChange={handleChange}
                required
                />
            </FormGroup>
            <FormGroup>
                <Input
                type="password"
                name="password"
                placeholder="pw"
                value={formData.password}
                onChange={handleChange}
                required
                />
            </FormGroup>
            
            <SubmitButton type="submit">Login</SubmitButton>

            <CheckboxWrap>
                <CheckboxLabel>
                {/* <HiddenCheckbox
                    type="checkbox"
                    checked={saveLogin}
                    onChange={(e) => setSaveLogin(e.target.checked)}
                /> */}
                {/* <CustomCheckbox checked={saveLogin}>
                    {saveLogin ? "✓" : ""}
                </CustomCheckbox> */}
                저장
                </CheckboxLabel>
            </CheckboxWrap>

            <FooterBrand>
                <IconSet>
                {/* SVG 아이콘 부분은 스타일만 입혀서 그대로 유지 */}
                {/* <HeadIcon width="3" height="3" viewBox="0 0 5 5" fill="none">
                    <path d="M0 2.30272C0 2.89806 0.235659 3.46902 0.655135 3.88998..." fill="#E53A4C" />
                </HeadIcon>
                <BodyIcon width="23" height="20" viewBox="0 0 23 20" fill="none">
                    <path d="M11.3761 5.06788C12.1069 5.06357..." fill="#009591" />
                </BodyIcon> */}
                </IconSet>
                <FooterTitle>하나금융그룹</FooterTitle>
            </FooterBrand>
            </Form>
        </Grid>
        </Wrapper>
    )
}


const Wrapper = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-image: url(${loginBg});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  pointer-events: none;
`;

const Grid = styled.div`
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const Header = styled.div`
  position: relative;
  z-index: 1;
  padding: 16px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(1px);
`;

const Title = styled.h1`
  font-family: "NotoSansKR", sans-serif;
  font-size: 34px;
  font-weight: 900;
  color: #ffffff;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
`;

const Description = styled.p`
  margin: 0;
  color: #808ba0;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Input = styled.input`
  height: 38px;
  width: 300px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  background-color: #393d42;
  color: #fff;
  z-index: 1;

  &::placeholder {
    color: #808ba0;
  }
`;

const SubmitButton = styled.button`
  height: 38px;
  width: 300px;
  margin-top: 8px;
  border: none;
  border-radius: 4px;
  background-color: #009591;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  z-index: 1;
  transition: background-color 0.2s;

  &:hover {
    background-color: #007a77;
  }
`;

const CheckboxWrap = styled.div`
  width: 300px;
  display: flex;
  justify-content: center;
  margin-top: 2px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
`;

const HiddenCheckbox = styled.input`
  display: none;
`;

const CustomCheckbox = styled.span`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #009591;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  background-color: ${(props) => (props.checked ? "#009591" : "transparent")};
  box-sizing: border-box;
`;

const FooterBrand = styled.div`
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const IconSet = styled.div`
  position: relative;
  width: 24px;
  height: 16px;
  flex-shrink: 0;
`;

const HeadIcon = styled.svg`
  position: absolute;
  top: 0px;
  left: 50%;
  transform: translateX(-50%) scale(1.6);
  transform-origin: center;
`;

const BodyIcon = styled.svg`
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%) scale(0.8);
  transform-origin: center;
`;

const FooterTitle = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
`;

export default LoginPage;