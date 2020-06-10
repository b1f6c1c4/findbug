#ifndef LATTICE_HOMO_SET_HPP
#define LATTICE_HOMO_SET_HPP

#include <vector>
#include "elem.hpp"

template <bool UD>
class homo_set {
    std::vector<elem> _els;

public:
    homo_set &operator+=(const elem &el);

    std::vector<elem>::const_iterator begin() const;
    std::vector<elem>::const_iterator end() const;

    bool operator<=(const elem &o) const;
    bool operator>=(const elem &o) const;
};

template<>
homo_set<true> &homo_set<true>::operator+=(const elem &el) {
    if (!(*this >= el))
        _els.push_back(el);
    return *this;
}

template<>
homo_set<false> &homo_set<false>::operator+=(const elem &el) {
    if (!(*this <= el))
        _els.push_back(el);
    return *this;
}

template<bool UD>
bool homo_set<UD>::operator>=(const elem &o) const {
    for (const auto &el : _els)
        if (el >= o)
            return true;
    return false;
}

template<bool UD>
bool homo_set<UD>::operator<=(const elem &o) const {
    for (const auto &el : _els)
        if (el <= o)
            return true;
    return false;
}

template<bool UD>
std::vector<elem>::const_iterator homo_set<UD>::begin() const {
    return _els.begin();
}

template<bool UD>
std::vector<elem>::const_iterator homo_set<UD>::end() const {
    return _els.end();
}

#endif //LATTICE_HOMO_SET_HPP
