"use client";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <FontAwesomeIcon icon={faChartLine} className="text-green-500 h-8 w-8" />
              <h1 className="text-3xl font-bold text-primary">Trading Ký</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Nhật ký giao dịch cá nhân
            </p>
          </div>

          <Button
            onClick={signInWithGoogle}
            size="lg"
            className="w-full gap-2"
          >
            <FontAwesomeIcon icon={faGoogle} className="h-4 w-4" />
            Đăng nhập bằng Google
          </Button>

          <p className="text-xs text-muted-foreground">
            Dữ liệu được lưu riêng theo tài khoản Google của bạn
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
