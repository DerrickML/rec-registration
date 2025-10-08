"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Calendar, Users, Sparkles, ArrowRight, Mail, MapPin } from "lucide-react"

export default function ConfirmationScreen({ onRegisterAnother }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FFB803] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0B7186] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#054653] rounded-full mix-blend-multiply filter blur-xl opacity-3 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto w-full">
          <div className="animate-in zoom-in duration-500">
            <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl">
              <CardHeader className="text-center pb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full mb-6 mx-auto shadow-lg animate-pulse">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#0B7186] to-[#054653] bg-clip-text text-transparent mb-4">
                  Registration Successful!
                </CardTitle>
                <CardDescription className="text-xl text-gray-600">
                  Welcome to REC25 & EXPO - Your journey to the future of renewable energy begins now!
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">
                {/* Success Animation */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-r from-[#0B7186]/10 to-[#FFB803]/10 rounded-full flex items-center justify-center animate-pulse">
                      <Sparkles className="w-16 h-16 text-[#0B7186]" />
                    </div>
                    <div className="absolute inset-0 w-32 h-32 border-4 border-[#0B7186]/20 rounded-full animate-ping"></div>
                  </div>
                </div>

                {/* What's Next Section */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-xl text-gray-800 mb-6 text-center">What's Next?</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-100">
                      <div className="flex-shrink-0 w-10 h-10 bg-[#0B7186]/10 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-[#0B7186]" />
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium">Confirmation Email</p>
                        <p className="text-gray-600 text-sm">
                          You'll receive a detailed confirmation email with your registration details and event
                          information.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-100">
                      <div className="flex-shrink-0 w-10 h-10 bg-[#FFB803]/10 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-[#0B7186]" />
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium">Event Updates</p>
                        <p className="text-gray-600 text-sm">
                          Stay tuned for speaker announcements, schedule updates, and exclusive pre-event content.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-100">
                      <div className="flex-shrink-0 w-10 h-10 bg-[#054653]/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#FFB803]" />
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium">Networking Opportunities</p>
                        <p className="text-gray-600 text-sm">
                          Connect with industry leaders, innovators, and fellow attendees before the event.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="text-center space-y-4 p-6 bg-white rounded-xl border border-gray-200">
                  <h4 className="font-bold text-xl text-gray-800 mb-4">Event Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="w-5 h-5 text-[#0B7186]" />
                      <span>
                        <strong className="text-gray-800">Dates:</strong> October 20-22, 2025
                      </span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <MapPin className="w-5 h-5 text-[#0B7186]" />
                      <span>
                        <strong className="text-gray-800">Venue:</strong> Kampala Serena Hotel, Uganda
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="text-center pt-4">
                  <Button
                    onClick={onRegisterAnother}
                    className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    Make Another Registration
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>

                {/* Footer Message */}
                <div className="text-center pt-6 border-t border-white/10">
                  <p className="text-gray-400 text-sm">
                    Thank you for joining us in shaping the future of renewable energy.
                    <br className="hidden sm:block" />
                    See you at REC25 & EXPO!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
